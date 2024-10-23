export async function fetchAbstractionData(req: Request) {
  try {
    const requestBody = await req.body;
    console.log("Body enviado:", requestBody); // Log para depuração

    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.delete("content-length");
    headers.delete("transfer-encoding");

    const res = await fetch(
      "https://supabasebackend-production.up.railway.app/abstractionBuyer",
      {
        method: req.method,
        headers: {
          ...Object.fromEntries(headers),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!res.ok) {
      throw new Error("Erro ao buscar dados da rota abstractionBuyer");
    }

    return await res.json();
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    throw new Error("Erro ao processar a requisição");
  }
}
