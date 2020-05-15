export interface Session {
  id: string;
  description: string;
  dateOfHearing: Date;
  documents: string[];
  participants: string[];
}
