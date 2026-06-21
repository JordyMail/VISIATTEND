import { handleGetUserDashboardQuestions } from "../routes/userDashboard";
import { Request, Response } from "express";

async function main() {
    const req = {
        query: {
            name: "silfan",
            email: "-"
        }
    } as unknown as Request;

    const res = {
        json: (data: any) => {
            console.log("Response data:", JSON.stringify(data, null, 2));
        },
        status: (code: number) => {
            console.log("Status code:", code);
            return res;
        }
    } as unknown as Response;

    try {
        await handleGetUserDashboardQuestions(req, res, () => {});
    } catch (e) {
        console.error(e);
    }
}

main();
