export type FieldError = { field: string; message: string }

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: FieldError[],
  ) {
    super(message)
    this.name = "ApiError"
  }
}
export default ApiError