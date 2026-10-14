import {
  lazy,
  useCallback,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import type { LazyPageComponentState } from "@/components/modules/lazyPage/types/lazyPageComponent";
import type { LazyPageLoader } from "@/types/components/lazyPage";

const lazyComponentsByLoader = new Map<
  LazyPageLoader,
  LazyExoticComponent<ComponentType>
>();
const failedLoaders = new Set<LazyPageLoader>();
const failuresWhileUnmounted = new Set<LazyPageLoader>();
const retriedLoaders = new Set<LazyPageLoader>();
const mountedCountByLoader = new Map<LazyPageLoader, number>();
const failureListeners = new Set<() => void>();

const renderNothing = () => null;

const subscribeToFailures = (listener: () => void) => {
  failureListeners.add(listener);
  return () => {
    failureListeners.delete(listener);
  };
};

const notifyFailureListeners = () =>
  failureListeners.forEach((listener) => listener());

const clearFailure = (loader: LazyPageLoader) => {
  failuresWhileUnmounted.delete(loader);
  if (failedLoaders.delete(loader)) notifyFailureListeners();
};

const trackMount = (loader: LazyPageLoader) => {
  mountedCountByLoader.set(loader, (mountedCountByLoader.get(loader) ?? 0) + 1);
  if (failuresWhileUnmounted.has(loader)) clearFailure(loader);
  return () => {
    const remaining = (mountedCountByLoader.get(loader) ?? 1) - 1;
    if (remaining > 0) mountedCountByLoader.set(loader, remaining);
    else mountedCountByLoader.delete(loader);
    clearFailure(loader);
  };
};

const createLazyComponent = (
  loader: LazyPageLoader,
): LazyExoticComponent<ComponentType> =>
  lazy(() =>
    loader().catch(() => {
      // Le navigateur garde en memoire l'echec d'un import dynamique : relancer le meme import echoue a l'instant, meme reseau revenu.
      // Apres un « Reessayer » qui echoue encore, on recharge la page (modules neufs, index a jour apres un deploiement) ; hors ligne
      // on garde l'alerte, le rechargement ne ferait qu'afficher l'ecran d'erreur du navigateur.
      if (retriedLoaders.delete(loader) && navigator.onLine)
        window.location.reload();
      lazyComponentsByLoader.delete(loader);
      failedLoaders.add(loader);
      if (!mountedCountByLoader.has(loader)) failuresWhileUnmounted.add(loader);
      notifyFailureListeners();
      return { default: renderNothing };
    }),
  );

export const useLazyPageComponent = (
  loader: LazyPageLoader,
): LazyPageComponentState => {
  const hasFailed = useSyncExternalStore(subscribeToFailures, () =>
    failedLoaders.has(loader),
  );

  useLayoutEffect(() => trackMount(loader), [loader]);

  const retry = useCallback(() => {
    retriedLoaders.add(loader);
    lazyComponentsByLoader.delete(loader);
    clearFailure(loader);
  }, [loader]);

  const cachedComponent = lazyComponentsByLoader.get(loader);
  if (cachedComponent)
    return { LazyComponent: cachedComponent, hasFailed, retry };

  const LazyComponent = createLazyComponent(loader);
  lazyComponentsByLoader.set(loader, LazyComponent);
  return { LazyComponent, hasFailed, retry };
};
