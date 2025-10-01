process.env.SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ogpwqkqsulbouecrnqlh.supabase.co";
process.env.SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncHdxa3FzdWxib3VlY3JucWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTIwNjg2MDQsImV4cCI6MjAyNzY0NDYwNH0.2vN_liHwaPBSw2qn53_1M60jubBuph3FjFgUANZG-cA";

jest.mock("redis", () => {
  const mockClient = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  return {
    createClient: jest.fn(() => mockClient),
  };
});
