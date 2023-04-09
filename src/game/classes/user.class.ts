import { Socket } from 'socket.io';

export class User {
    id_: string;
    socketId_: string;
    name_: string;
    email_: string;
    avatarImageUrl_: string;
    roomId_: string;

    constructor(
        id: string,
        socketId: string,
        roomId: string,
        name: string,
        email: string,
        avatarImageUrl: string,
    ) {
        this.id_ = id;
        this.socketId_ = socketId;
        this.roomId_ = roomId;
        this.name_ = name;
        this.email_ = email;
        this.avatarImageUrl_ = avatarImageUrl;
    }

    public setRoomId(roomId: string): void {
        this.roomId_ = roomId;
    }

    public getRoomId(): string {
        return this.roomId_;
    }

    public getName(): string {
        return this.name_;
    }

    public getSocketId(): string {
        return this.socketId_;
    }
    

    public getId(): string {
        return this.id_;
    }

}