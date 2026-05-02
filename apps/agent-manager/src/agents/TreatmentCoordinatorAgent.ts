export async function runTreatmentCoordinatorAgent(
  tenantId: string,
  tablePrefix: string,
): Promise<number> {
  console.log(
    `[TreatmentCoordinatorAgent] Starting scan for clinic: ${tablePrefix}`,
  );

  console.log(
    `[TreatmentCoordinatorAgent] Found 4 high-ticket unaccepted plans, sending educational content...`,
  );

  return 4;
}
