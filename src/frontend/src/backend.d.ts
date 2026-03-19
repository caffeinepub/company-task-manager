import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Task {
    id: bigint;
    status: TaskStatus;
    assignee: Principal;
    title: string;
    createdAt: bigint;
    dueDate: string;
    description: string;
    priority: Priority;
}
export interface UserProfile {
    name: string;
    email: string;
}
export interface UserProfileEntry {
    principal: Principal;
    profile: UserProfile;
}
export enum Priority {
    low = "low",
    high = "high",
    medium = "medium"
}
export enum TaskStatus {
    done = "done",
    todo = "todo",
    inProgress = "inProgress"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bootstrapAdmin(): Promise<boolean>;
    hasAnyAdmin(): Promise<boolean>;
    countAllTasksByStatus(): Promise<[bigint, bigint, bigint]>;
    countTasksByStatus(): Promise<[bigint, bigint, bigint]>;
    createTask(title: string, description: string, assignee: Principal, dueDate: string, priority: Priority): Promise<bigint>;
    deleteTask(taskId: bigint): Promise<void>;
    getAllTasks(): Promise<Array<Task>>;
    getAllUserProfiles(): Promise<Array<UserProfileEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMyTasks(): Promise<Array<Task>>;
    getTask(taskId: bigint): Promise<Task | null>;
    getTasksByEmployee(employee: Principal): Promise<Array<Task>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateTaskStatus(taskId: bigint, newStatus: TaskStatus): Promise<void>;
}
