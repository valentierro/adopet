/** Tutor PF (sem conta parceiro) com contagem de adoções (admin). */
export interface TopTutorPfItemDto {
  userId: string;
  name: string;
  email: string;
  username: string | null;
  adoptionCount: number;
}
