declare module "sslcommerz-lts" {
  class SSLCommerzPayment {
    constructor(
      storeId: string,
      storePassword: string,
      isLive: boolean,
    );

    init(data: Record<string, unknown>): Promise<unknown>;
    validate(data: Record<string, unknown>): Promise<unknown>;
  }

  export default SSLCommerzPayment;
}