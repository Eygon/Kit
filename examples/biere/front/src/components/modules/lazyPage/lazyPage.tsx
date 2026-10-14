import { Suspense } from "react";
import { ChunkLoadErrorAlert } from "@/components/modules/lazyPage/components/chunkLoadErrorAlert/chunkLoadErrorAlert";
import { PageLoadingState } from "@/components/modules/lazyPage/components/pageLoadingState/pageLoadingState";
import { useLazyPageComponent } from "@/components/modules/lazyPage/hooks/useLazyPageComponent";
import type { LazyPageProps } from "@/types/components/lazyPage";

export const LazyPage = ({ loader }: LazyPageProps) => {
  const { LazyComponent, hasFailed, retry } = useLazyPageComponent(loader);

  if (hasFailed) return <ChunkLoadErrorAlert onRetry={retry} />;

  return (
    <Suspense fallback={<PageLoadingState />}>
      <LazyComponent />
    </Suspense>
  );
};
