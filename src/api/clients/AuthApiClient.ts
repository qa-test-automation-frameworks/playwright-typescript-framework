import { BaseApiClient } from '../BaseApiClient';
import {
  UserResponseSchema,
  UserResponse,
  LoginRequest,
  RegisterRequest,
  UpdateUserRequest,
} from '../models/auth.model';

export class AuthApiClient {
  constructor(private api: BaseApiClient) {}

  public async register(data: RegisterRequest): Promise<UserResponse> {
    const res = await this.api.post<UserResponse>('/users', UserResponseSchema, data);
    if (res.user?.token) {
      this.api.setToken(res.user.token);
    }
    return res;
  }

  public async login(data: LoginRequest): Promise<UserResponse> {
    const res = await this.api.post<UserResponse>('/users/login', UserResponseSchema, data);
    if (res.user?.token) {
      this.api.setToken(res.user.token);
    }
    return res;
  }

  public async getCurrentUser(): Promise<UserResponse> {
    return this.api.get<UserResponse>('/user', UserResponseSchema);
  }

  public async updateUser(data: UpdateUserRequest): Promise<UserResponse> {
    return this.api.put<UserResponse>('/user', UserResponseSchema, data);
  }
}
