import { z } from "zod"

// A required string that says "<label> is required" when it is missing
export const text = (label: string) => z.string({ error: `${label} is required` })