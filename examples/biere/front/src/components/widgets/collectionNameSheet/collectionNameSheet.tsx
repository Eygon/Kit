import {
  Button,
  Description,
  Drawer,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { CUSTOM_COLLECTIONS_MAX } from "@/constants/collectionConstants";
import type { CollectionNameSheetProps } from "@/types/components/collectionNameSheet";
import { CollectionNameSheetModeEnum } from "@/types/enums/collection/collectionNameSheetModeEnum";

const MAX_NAME_LENGTH = 40;
const EMPTY_NAME = "";

const isNameValid = (name: string): boolean => {
  const length = name.trim().length;
  return length >= 1 && length <= MAX_NAME_LENGTH;
};

export const CollectionNameSheet = ({
  mode = CollectionNameSheetModeEnum.CREATE,
  initialName = EMPTY_NAME,
  customCollectionCount = 0,
  isPending,
  onSave,
}: CollectionNameSheetProps) => {
  const { t } = useTranslation();
  const isRenaming = mode === CollectionNameSheetModeEnum.RENAME;
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (nextIsOpen) {
      setName(initialName);
      setHasAttemptedSubmit(false);
    }
    setIsOpen(nextIsOpen);
  };

  const send = async () => {
    try {
      const saved = await onSave(name);
      if (saved !== null) setIsOpen(false);
    } catch {
      return;
    }
  };

  const isAtLimit =
    !isRenaming && customCollectionCount >= CUSTOM_COLLECTIONS_MAX;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (!isNameValid(name) || isAtLimit) return;
    void send();
  };

  const getFieldError = (): string | null => {
    if (!hasAttemptedSubmit) return null;
    if (!isNameValid(name)) return t("collections.create.nameError");
    return isAtLimit ? t("collections.create.limitReached") : null;
  };
  const fieldError = getFieldError();

  return (
    <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Button variant="tertiary" size="lg">
        {t(isRenaming ? "pages.collection.rename" : "collections.create.open")}
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom" className="h-dvh md:h-auto">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading className="break-words">
                {t(
                  isRenaming
                    ? "pages.collection.renameTitle"
                    : "collections.create.title",
                )}
              </Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[calc(100dvh-8rem)] min-w-0 flex-col gap-4 overflow-y-auto p-1 md:max-h-[60dvh]">
              <Form
                validationBehavior="aria"
                onSubmit={handleSubmit}
                className="flex min-w-0 flex-col gap-4"
              >
                <TextField
                  isRequired
                  name="name"
                  value={name}
                  onChange={setName}
                  validate={() => fieldError}
                >
                  <Label>
                    {t(
                      isRenaming
                        ? "pages.collection.renameLabel"
                        : "collections.create.nameLabel",
                    )}
                  </Label>
                  <Input className="min-h-11" />
                  <Description>{t("collections.create.nameHint")}</Description>
                  <FieldError />
                </TextField>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isPending={isPending}
                >
                  {t(
                    isRenaming
                      ? "pages.collection.renameSave"
                      : "collections.create.save",
                  )}
                </Button>
                {isRenaming && (
                  <Button slot="close" variant="tertiary" size="lg" fullWidth>
                    {t("pages.collection.renameCancel")}
                  </Button>
                )}
              </Form>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
