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

import { customerReport } from "../customerReport";
import { customerReportDetails } from "../customerReportDetails";
import { abstraction } from "../abstractionBuyer";

const PROJECT_ID = "1726229865300x805127984190062600";
const USER_ID = "1726229792537x967159743204337900";

type MockResponse = {
  statusCode?: number;
  jsonPayload?: any;
  status: jest.Mock;
  json: jest.Mock;
};

const createMockResponse = (): MockResponse => {
  const response: Partial<MockResponse> = {};

  response.json = jest.fn((payload) => {
    response.jsonPayload = payload;
    return payload;
  });

  response.status = jest.fn((statusCode: number) => {
    response.statusCode = statusCode;
    return {
      json: response.json!,
    };
  });

  return response as MockResponse;
};

describe("customerReport integration", () => {
  it("should return aggregated metrics from Supabase data", async () => {
    const req = {
      method: "POST",
      body: {
        projectId: PROJECT_ID,
        userId: USER_ID,
      },
    };

    const res = createMockResponse();

    await customerReport(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledTimes(1);

    const payload = res.jsonPayload;

    expect(payload).toMatchObject({
      totalTransactions: expect.any(Number),
      totalBuyers: expect.any(Number),
      totalSpend: expect.any(String),
    });

    expect(payload.totalBuyers).toBeGreaterThan(0);
    expect(Number(payload.totalSpend)).toBeGreaterThanOrEqual(0);
  }, 120000);
});

describe("customerReportDetails integration", () => {
  it("should paginate buyer details from Supabase", async () => {
    const req = {
      method: "POST",
      body: {
        projectId: PROJECT_ID,
        userId: USER_ID,
        page: "1",
        limit: "5",
        orderKey: "totalTransactions",
        orderDirection: "DESC",
      },
    };

    const res = createMockResponse();

    await customerReportDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const payload = res.jsonPayload;

    expect(payload).toEqual(
      expect.objectContaining({
        currentPage: 1,
        data: expect.any(Array),
        totalBuyers: expect.any(Number),
        totalTransactions: expect.any(Number),
      })
    );

    expect(payload.data.length).toBeGreaterThan(0);
  }, 120000);
});

describe("shop list ordering", () => {
  it("keeps child transactions after non-child on the same day", async () => {
    const projectId = "1714218405324x200046058488987650";
    const userId = "1714169827817x375431784325096960";

    const req = {
      method: "POST",
      body: {
        projectId,
        userId,
      },
    };

    const { filteredBuyersData } = await abstraction({ req });

    const targetBuyer = filteredBuyersData.find((buyer) => {
      const hasParent = buyer.shopList.some(
        (item) =>
          item.offerId === "y0vxromm" && item.date.startsWith("2024-04-10")
      );
      const hasChild = buyer.shopList.some(
        (item) =>
          item.offerId === "j4q0pgne" && item.date.startsWith("2024-04-10")
      );

      return hasParent && hasChild;
    });

    expect(targetBuyer).toBeDefined();

    const sameDayItems = targetBuyer!.shopList.filter((item) =>
      item.date.startsWith("2024-04-10")
    );

    expect(sameDayItems.length).toBeGreaterThan(1);

    const isChild = (item: typeof sameDayItems[number]) =>
      item.bumpType === "Child" || item.bumpIndex === "Child";

    const childIndices = sameDayItems
      .map((item, index) => (isChild(item) ? index : -1))
      .filter((index) => index >= 0);

    expect(childIndices.length).toBeGreaterThan(0);

    const firstChildIndex = Math.min(...childIndices);

    const nonChildAfterChild = sameDayItems.some(
      (item, index) => index > firstChildIndex && !isChild(item)
    );

    expect(nonChildAfterChild).toBe(false);
    expect(firstChildIndex).toBeGreaterThan(0);
    expect(isChild(sameDayItems[sameDayItems.length - 1])).toBe(true);
  }, 120000);
});
