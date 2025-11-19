import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Sales (Today)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">€1,245.00</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Food Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">28.5%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Active Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-red-500">3</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
