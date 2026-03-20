import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface CompletionDate {
    taskId: bigint;
    completionTimestamp: bigint;
}
export interface UserProfileEntry {
    principal: Principal;
    profile: UserProfile;
}
export interface Task {
    id: bigint;
    status: TaskStatus;
    assignee: Principal;
    title: string;
    createdAt: bigint;
    description: string;
    targetDate: string;
    priority: Priority;
    frequency: FrequencyType;
    frequencyDays: string;
    department: string;
}
export interface UserProfile {
    name: string;
    email: string;
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
export enum FrequencyType {
    none = "none",
    daily = "daily",
    weekly = "weekly",
    monthly = "monthly"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignUserRoleAsAdmin(user: Principal, role: UserRole): Promise<void>;
    bootstrapAdmin(): Promise<boolean>;
    countTasksByStatus(): Promise<[bigint, bigint, bigint]>;
    createTask(title: string, description: string, assignee: Principal, targetDate: string, priority: Priority, frequency: FrequencyType, frequencyDays: string, department: string): Promise<bigint>;
    deleteTask(taskId: bigint): Promise<void>;
    getAdminCount(): Promise<bigint>;
    getAllTasks(): Promise<Array<Task>>;
    getAllUserProfiles(): Promise<Array<UserProfileEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCompletionDates(): Promise<Array<CompletionDate>>;
    getMyTasks(): Promise<Array<Task>>;
    getTask(taskId: bigint): Promise<Task | null>;
    getTasksByEmployee(employee: Principal): Promise<Array<Task>>;
    getUserProfile(userPrincipal: Principal): Promise<UserProfile | null>;
    hasAnyAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateTaskStatus(taskId: bigint, newStatus: TaskStatus): Promise<void>;
}
