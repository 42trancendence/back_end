export class UserInfo {
  id: string;
  name: string;
  email: string;
}

export interface ActiveUser {
  id: string;
  socketId: string;
  status: boolean;
}
