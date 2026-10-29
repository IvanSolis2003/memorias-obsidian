export class NextResponse {
  static json(cuerpo, init) {
    return { cuerpo, estado: init?.status ?? 200 };
  }
}
