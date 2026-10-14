import { Button, Spinner } from "@heroui/react";
import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { SubmitButtonProps } from "@/types/components/submitButton";

export const SubmitButton = ({ label, isPending, form, isFullWidth = true }: SubmitButtonProps) => {
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    buttonRef.current?.setAttribute("aria-busy", String(isPending));
  }, [isPending]);

  return (
    <Button ref={buttonRef} type="submit" form={form} size="lg" fullWidth={isFullWidth} isPending={isPending}>
      {isPending && <Spinner size="sm" color="current" />}
      {isPending ? t("common.saving") : label}
    </Button>
  );
};
