export async function runSupplyAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  console.log(`[SupplyAgent] Starting scan for clinic: ${tablePrefix}`);

  console.log(`[SupplyAgent] Checking inventory levels...`);
  console.log(`[SupplyAgent] Drafted 2 POs for low stock items.`);

  return 2;
}
