import { authApi, patientsApi } from "./apps/web/src/lib/api";

async function main() {
  try {
    console.log("Logging in...");
    const loginRes = await authApi.login({
      email: "demo@dentaliq.ca",
      password: "demo",
    });
    if ("accessToken" in loginRes) {
      console.log("Logged in! Fetching patients...");
      const patients = await patientsApi.getPatients(loginRes.accessToken);
      console.log(`Fetched ${patients.length} patients from API.`);
      if (patients.length > 0) {
        console.log("First patient:", patients[0]);
      }
    } else {
      console.log("Login failed or requires MFA");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
