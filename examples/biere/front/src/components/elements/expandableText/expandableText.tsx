import { Button } from "@heroui/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ExpandableTextProps } from "@/types/components/expandableText";

export const ExpandableText = ({ text }: ExpandableTextProps) => {
  const { t } = useTranslation();
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const paragraph = paragraphRef.current;
    if (paragraph === null || isExpanded) return;
    setIsOverflowing(paragraph.scrollHeight > paragraph.clientHeight);
  }, [text, isExpanded]);

  return (
    <div className="flex min-w-0 flex-col items-start">
      <p ref={paragraphRef} className={isExpanded ? "break-words" : "line-clamp-3 break-words"}>
        {text}
      </p>
      {isOverflowing && (
        <Button
          variant="ghost"
          className="min-h-11"
          aria-expanded={isExpanded}
          onPress={() => setIsExpanded((previous) => !previous)}
        >
          {isExpanded ? t("common.showLess") : t("common.showMore")}
        </Button>
      )}
    </div>
  );
};
