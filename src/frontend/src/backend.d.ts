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
    frequencyDays: string;
    title: string;
    createdAt: bigint;
    description: string;
    targetDate: string;
    priority: Priority;
    frequency: FrequencyType;
    department: string;
}
export interface UserProfile {
    name: string;
    email: string;
}
export interface TaskPauseState {
    pausedAt: string;
    unpausedAt: string;
}
export enum FrequencyType {
    none = "none",
    monthly = "monthly",
    daily = "daily",
    weekly = "weekly"
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
    getTaskInstanceCompletions(): Promise<Array<[string, bigint]>>;
    getTaskPauseStates(): Promise<Array<[bigint, TaskPauseState]>>;
    getTasksByEmployee(employee: Principal): Promise<Array<Task>>;
    getUserProfile(userPrincipal: Principal): Promise<UserProfile | null>;
    hasAnyAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    markTaskInstanceDone(taskId: bigint, targetDate: string): Promise<void>;
    pauseTask(taskId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    unmarkTaskInstanceDone(taskId: bigint, targetDate: string): Promise<void>;
    unpauseTask(taskId: bigint): Promise<void>;
    updateTaskStatus(taskId: bigint, newStatus: TaskStatus): Promise<void>;
}
