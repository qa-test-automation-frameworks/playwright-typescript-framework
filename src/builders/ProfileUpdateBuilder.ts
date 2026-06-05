import { faker } from '@faker-js/faker';

export type UpdateProfileRequest = {
  user: {
    bio?: string;
    image?: string;
  };
};

export class ProfileUpdateBuilder {
  private bio = faker.person.bio();
  private image = faker.image.avatar();

  public withBio(bio: string): this {
    this.bio = bio;
    return this;
  }

  public withImage(image: string): this {
    this.image = image;
    return this;
  }

  public build(): UpdateProfileRequest {
    return {
      user: {
        bio: this.bio,
        image: this.image,
      },
    };
  }
}
