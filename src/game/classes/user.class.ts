import { ExecFileSyncOptionsWithBufferEncoding } from "child_process";

export class User {
    id: string;
    name: string;
    email: string;
    avatarImageUrl: string;
    roomId: string;

    constructor(
        id: string,
        name: string,
        email: string,
        avatarImageUrl: string,
        status: string,
        roomId: string
    ) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.avatarImageUrl = avatarImageUrl;
        this.roomId = roomId;
    }

    public setRoomId(roomId: string): void {
        this.roomId = roomId;
    }

    public getRoomId(): string {
        return this.roomId
    }
}