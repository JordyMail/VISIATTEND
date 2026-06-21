import axios from "axios";

async function main() {
    try {
        const response = await axios.get("http://localhost:8080/api/user-dashboard/questions", {
            params: {
                name: "silfan"
            }
        });
        console.log("Axios response.data:", JSON.stringify(response.data, null, 2));
        console.log("Array.isArray(response.data.data):", Array.isArray(response.data.data));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
