import { useCallback, useRef, useState } from "react";
import { GeolocationStatusEnum } from "@/pages/map/types/geolocationStatusEnum";
import { GEOLOCATION_PERMISSION_DENIED_CODE, GEOLOCATION_TIMEOUT_MS } from "@/pages/map/utils/mapConstants";
import type { GeoPosition } from "@/types/models/venue/geoPosition";

export const useGeolocation = () => {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [status, setStatus] = useState<GeolocationStatusEnum>(GeolocationStatusEnum.IDLE);
  const isLocating = useRef(false);

  const locate = useCallback(() => {
    if (isLocating.current) return;
    if (!navigator.geolocation) {
      setStatus(GeolocationStatusEnum.UNAVAILABLE);
      return;
    }
    isLocating.current = true;
    setStatus(GeolocationStatusEnum.LOCATING);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        isLocating.current = false;
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setStatus(GeolocationStatusEnum.LOCATED);
      },
      (error) => {
        isLocating.current = false;
        setStatus(
          error.code === GEOLOCATION_PERMISSION_DENIED_CODE
            ? GeolocationStatusEnum.DENIED
            : GeolocationStatusEnum.UNAVAILABLE,
        );
      },
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  }, []);

  return { position, status, locate };
};
