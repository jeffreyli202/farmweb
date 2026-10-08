export type AuthFormState = {
  error?: string;
  verificationUrl?: string;
};

export type VerifyState = {
  error?: string;
  message?: string;
};

export type CurrentUser = {
  id: number;
  email: string;
  isAdmin: boolean;
};
