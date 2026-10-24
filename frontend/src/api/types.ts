// The shapes the backend sends and accepts. Prices are decimal strings such as "25000.00", never numbers.

export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: string;
  quantity: number;
}

export type NewVehicle = Omit<Vehicle, "id">;

/** What an admin may edit on an existing vehicle; stock changes only through purchase and restock. */
export type VehicleChanges = Partial<Pick<Vehicle, "make" | "model" | "category" | "price">>;

/** Every filter is optional; blank ones mean "no filter". */
export interface VehicleFilters {
  make?: string;
  model?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
}

/** One invalid field in a 400 response. */
export interface ApiErrorDetail {
  field: string;
  message: string;
}
