import { Button, Description, Drawer, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AvatarPicker } from "@/pages/profile/components/elements/avatarPicker/avatarPicker";
import { useUpdateProfileMutation } from "@/pages/profile/hooks/useUpdateProfileMutation";
import type { EditProfileSheetProps } from "@/pages/profile/types/editProfileSheet";
import type { ProfileFormValues } from "@/pages/profile/types/profileFormValues";
import { formValuesToProfileChanges, isDisplayNameValid, profileToFormValues } from "@/pages/profile/utils/profileFormValues";

export const EditProfileSheet = ({ profile }: EditProfileSheetProps) => {
  const { t } = useTranslation();
  const { saveProfile, isPending } = useUpdateProfileMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<ProfileFormValues>(() => profileToFormValues(profile));
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const updateValue = <TKey extends keyof ProfileFormValues>(key: TKey, value: ProfileFormValues[TKey]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (nextIsOpen) {
      setValues(profileToFormValues(profile));
      setHasAttemptedSubmit(false);
    }
    setIsOpen(nextIsOpen);
  };

  const send = async () => {
    try {
      const saved = await saveProfile(formValuesToProfileChanges(values));
      if (saved !== null) setIsOpen(false);
    } catch {
      return;
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (!isDisplayNameValid(values.displayName)) return;
    void send();
  };

  const nameError = hasAttemptedSubmit && !isDisplayNameValid(values.displayName) ? t("pages.profile.edit.nameError") : null;

  return (
    <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Button variant="tertiary" size="lg">
        {t("pages.profile.edit.open")}
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom" className="h-dvh md:h-auto">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading className="break-words">{t("pages.profile.edit.title")}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[calc(100dvh-8rem)] min-w-0 flex-col gap-4 overflow-y-auto p-1 md:max-h-[60dvh]">
              <Form validationBehavior="aria" onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4">
                <TextField
                  isRequired
                  name="displayName"
                  value={values.displayName}
                  onChange={(displayName) => updateValue("displayName", displayName)}
                  validate={() => nameError}
                >
                  <Label>{t("pages.profile.edit.nameLabel")}</Label>
                  <Input className="min-h-11" />
                  <Description>{t("pages.profile.edit.nameHint")}</Description>
                  <FieldError />
                </TextField>
                <AvatarPicker value={values.avatar} onChange={(avatar) => updateValue("avatar", avatar)} />
                <Button type="submit" variant="primary" size="lg" fullWidth isPending={isPending}>
                  {t("pages.profile.edit.save")}
                </Button>
              </Form>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
