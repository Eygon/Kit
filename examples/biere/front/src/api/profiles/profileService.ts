import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { ProfileDto } from "@/types/dtos/profile/profileDto";
import type { ProfileSummaryDto } from "@/types/dtos/profile/profileSummaryDto";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { profileDtoToModel } from "@/types/mappers/profile/profileMapper";
import { profileSummaryDtoToModel } from "@/types/mappers/profile/profileSummaryMapper";
import { buildSaveProfileDto } from "@/types/mappers/profile/saveProfileMapper";
import type { Profile } from "@/types/models/profile/profile";
import type { ProfileChanges } from "@/types/models/profile/profileChanges";
import type { ProfileSummary } from "@/types/models/profile/profileSummary";
import { ME_PROFILE, USERS, USER_FOLLOW, USER_FOLLOWERS, USER_FOLLOWING, USER_PROFILE } from "@/utils/apiURL/apiURL";
import { DisplayError } from "@/utils/displayError/displayError";

export default class ProfileService {
  static async getProfile(userId: number): Promise<Profile | null> {
    try {
      const response = await httpClient.get<ProfileDto>(USER_PROFILE(userId));
      if (response.data === null) throw new HttpError(response.status, "Empty profile");
      return profileDtoToModel(response.data);
    } catch (error) {
      if (error instanceof HttpError && error.status === HttpStatusCodeEnum.NOT_FOUND) return null;
      throw error;
    }
  }

  static async getAll(): Promise<ProfileSummary[]> {
    const response = await httpClient.get<ProfileSummaryDto[]>(USERS());
    return (response.data ?? []).map(profileSummaryDtoToModel);
  }

  static async getFollowers(userId: number): Promise<ProfileSummary[]> {
    const response = await httpClient.get<ProfileSummaryDto[]>(USER_FOLLOWERS(userId));
    return (response.data ?? []).map(profileSummaryDtoToModel);
  }

  static async getFollowing(userId: number): Promise<ProfileSummary[]> {
    const response = await httpClient.get<ProfileSummaryDto[]>(USER_FOLLOWING(userId));
    return (response.data ?? []).map(profileSummaryDtoToModel);
  }

  static async updateMine(changes: ProfileChanges): Promise<Profile> {
    try {
      const response = await httpClient.put<ProfileDto>(ME_PROFILE(), buildSaveProfileDto(changes));
      if (response.data === null) throw new HttpError(response.status, "Empty profile");
      return profileDtoToModel(response.data);
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }

  static async follow(userId: number): Promise<Profile> {
    try {
      const response = await httpClient.post<ProfileDto>(USER_FOLLOW(userId), undefined);
      if (response.data === null) throw new HttpError(response.status, "Empty profile");
      return profileDtoToModel(response.data);
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }

  static async unfollow(userId: number): Promise<void> {
    try {
      await httpClient.delete(USER_FOLLOW(userId));
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }
}
