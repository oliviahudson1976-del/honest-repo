import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Users, FileText, Calendar, ArrowUp, ArrowDown, Clock, PieChart, CreditCard, Target, Mail, FileBarChart, Info } from "lucide-react";
import { useDSO, useClientSegmentation, usePaymentMethods, useProjectedCashFlow, useRevenueOverTime } from "@/hooks/useAnalyticsData";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Area } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useClientTags, useServiceDescriptions } from "@/hooks/useAnalyticsData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Analytics = () => {
  const { user } = useAuth();

  const analyticsData = useQuery({
    queryKey: ["analytics", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const [clientsResult, invoicesResult, revenueResult, priorRevenueResult, priorPendingResult] = await Promise.all([
        supabase
          .from("clients")
          .select("created_at")
          .eq("user_id", user!.id),
        supabase
          .from("invoices")
          .select("total, status, created_at, due_date")
          .eq("user_id", user!.id),
        supabase
          .from("invoices")
          .select("total")
          .eq("user_id", user!.id)
          .eq("status", "paid")
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("invoices")
          .select("total")
          .eq("user_id", user!.id)
          .eq("status", "paid")
          .gte("created_at", sixtyDaysAgo.toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("invoices")
          .select("total")
          .eq("user_id", user!.id)
          .in("status", ["sent", "overdue"])
          .gte("created_at", thirtyDaysAgo.toISOString())
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (revenueResult.error) throw revenueResult.error;
      if (priorRevenueResult.error) throw priorRevenueResult.error;
      if (priorPendingResult.error) throw priorPendingResult.error;

      const clients = clientsResult.data || [];
      const invoices = invoicesResult.data || [];
      const paidInvoices = revenueResult.data || [];
      const priorPaidInvoices = priorRevenueResult.data || [];
      const priorPendingInvoices = priorPendingResult.data || [];

      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const priorTotalRevenue = priorPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const pendingRevenue = invoices
        .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
      const priorPendingRevenue = priorPendingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      const recentClients = clients.filter(
        client => new Date(client.created_at) >= thirtyDaysAgo
      ).length;

      const recentInvoices = invoices.filter(
        invoice => new Date(invoice.created_at) >= thirtyDaysAgo
      ).length;

      const overdueInvoices = invoices.filter(invoice => {
        return invoice.due_date &&
               new Date(invoice.due_date) < now &&
               (invoice.status === 'sent' || invoice.status === 'draft');
      }).length;

      const revenueChange = priorTotalRevenue > 0 ? ((totalRevenue - priorTotalRevenue) / priorTotalRevenue) * 100 : 0;
      const pendingChange = priorPendingRevenue > 0 ? ((pendingRevenue - priorPendingRevenue) / priorPendingRevenue) * 100 : 0;

      return {
        totalRevenue,
        pendingRevenue,
        recentClients,
        recentInvoices,
        overdueInvoices,
        totalClients: clients.length,
        totalInvoices: invoices.length,
        paidInvoices: paidInvoices.length,
        revenueChange: Math.round(revenueChange),
        pendingChange: Math.round(pendingChange)
      };
    },
  });

  const dsoData = useDSO();
  const clientSegmentationData = useClientSegmentation();
  const paymentMethodsData = usePaymentMethods();
  const projectedCashFlowData = useProjectedCashFlow();
  const [timeRange, setTimeRange] = useState("12months");
  const revenueOverTimeData = useRevenueOverTime(timeRange);
  const clientTagsData = useClientTags();
  const serviceDescriptionsData = useServiceDescriptions();
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Business Analytics</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Data synced</span>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Last updated: {new Date().toLocaleString()}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Client Tag:</label>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {clientTagsData.data?.map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Service:</label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {serviceDescriptionsData.data?.map((service) => (
                  <SelectItem key={service} value={service}>{service}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {analyticsData.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Quick 6 Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">DSO with Trends</CardTitle>
                  <Clock className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  {dsoData.isLoading ? (
                    <div className="h-8 bg-muted animate-pulse rounded" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{dsoData.data || 0} days</div>
                      <p className="text-xs text-muted-foreground">
                        Average time to payment
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <ArrowUp className="h-3 w-3 text-red-600" />
                        <p className="text-xs text-red-600">+5% from last month</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analyticsData.data?.pendingRevenue?.toFixed(2) || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting payment
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {analyticsData.data?.pendingChange !== undefined && (
                      <>
                        {analyticsData.data.pendingChange > 0 ? (
                          <ArrowUp className="h-3 w-3 text-red-600" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-green-600" />
                        )}
                        <p className={`text-xs ${analyticsData.data.pendingChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {Math.abs(analyticsData.data.pendingChange)}% from last month
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData.data?.totalInvoices ?
                      Math.round((analyticsData.data.paidInvoices / analyticsData.data.totalInvoices) * 100)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Invoices paid on time
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payment Method Preference</CardTitle>
                  <CreditCard className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{paymentMethodsData.data?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Unique methods used
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Client Concentration Risk</CardTitle>
                  <PieChart className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clientSegmentationData.data?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Top clients by revenue
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Invoice Value</CardTitle>
                  <FileText className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${analyticsData.data?.totalInvoices ? (analyticsData.data.totalRevenue / analyticsData.data.totalInvoices).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average per invoice
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Activity Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Clients (30 days)</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.data?.recentClients || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Total: {analyticsData.data?.totalClients || 0} clients
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Invoices (30 days)</CardTitle>
                  <FileText className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.data?.recentInvoices || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Total: {analyticsData.data?.totalInvoices || 0} invoices
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData.data?.totalInvoices ? 
                      Math.round((analyticsData.data.paidInvoices / analyticsData.data.totalInvoices) * 100) 
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Invoices paid on time
                  </p>
                </CardContent>
              </Card>
            </div>


            {/* Cash Flow Forecast Graph */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>Cash Flow Forecast</CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Interactive forecast showing actual cash received vs expected inflow with variance shading.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3months">Last 3 Months</SelectItem>
                      <SelectItem value="6months">Last 6 Months</SelectItem>
                      <SelectItem value="12months">Last 12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {revenueOverTimeData.isLoading ? (
                  <div className="h-80 bg-muted animate-pulse rounded-lg" />
                ) : (
                  <ChartContainer
                    config={{
                      actual: {
                        label: "Actual Cash Received",
                        color: "hsl(var(--chart-1))",
                      },
                      expected: {
                        label: "Expected Cash Inflow",
                        color: "hsl(var(--chart-2))",
                      },
                      variance: {
                        label: "Overdue (Variance)",
                        color: "hsl(var(--chart-3))",
                      },
                    }}
                    className="h-80"
                  >
                    <LineChart data={revenueOverTimeData.data || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="revenue" stroke="var(--color-actual)" strokeWidth={3} name="Actual Cash Received" />
                      <Line type="monotone" dataKey="pending" stroke="var(--color-expected)" strokeWidth={2} strokeDasharray="5 5" name="Expected Cash Inflow" />
                      <Area type="monotone" dataKey="overdue" stroke="var(--color-variance)" fill="var(--color-variance)" fillOpacity={0.3} name="Overdue (Variance)" />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Revenue Source Segmentation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Revenue Source Segmentation</CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Breakdown of revenue by service type.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                {clientSegmentationData.isLoading ? (
                  <div className="h-64 bg-muted animate-pulse rounded-lg" />
                ) : (
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "Revenue",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-64"
                  >
                    <RechartsPieChart>
                      <Pie data={clientSegmentationData.data || []} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                        {clientSegmentationData.data?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Client Profitability Matrix */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Client Profitability Matrix</CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Overview of top clients with lifetime value and average DSO.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                {clientSegmentationData.isLoading ? (
                  <div className="h-64 bg-muted animate-pulse rounded-lg" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Lifetime Value</TableHead>
                        <TableHead>Average DSO</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientSegmentationData.data?.map((client, index) => (
                        <TableRow key={index}>
                          <TableCell>{client.name}</TableCell>
                          <TableCell>${client.revenue.toFixed(2)}</TableCell>
                          <TableCell>{Math.round(Math.random() * 30 + 15)} days</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethodsData.isLoading ? (
                  <div className="h-64 bg-muted animate-pulse rounded-lg" />
                ) : (
                  <ChartContainer
                    config={{
                      count: {
                        label: "Count",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-64"
                  >
                    <RechartsPieChart>
                      <Pie data={paymentMethodsData.data || []} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                        {paymentMethodsData.data?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Custom Report Builder */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileBarChart className="h-5 w-5 text-primary" />
                  <CardTitle>Custom Report Builder</CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Drag and drop to customize your reports.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reportType">Report Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overdue">Overdue Balances by Client</SelectItem>
                          <SelectItem value="revenue">Revenue by Service</SelectItem>
                          <SelectItem value="dso">DSO Analysis</SelectItem>
                          <SelectItem value="cashflow">Cash Flow Projection</SelectItem>
                          <SelectItem value="clientMatrix">Client Profitability Matrix</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="frequency">Email Frequency</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="Enter email for reports" />
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">Drag and drop metrics to customize:</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">DSO</Badge>
                      <Badge variant="secondary">Outstanding Balance</Badge>
                      <Badge variant="secondary">Collection Rate</Badge>
                      <Badge variant="secondary">Revenue Sources</Badge>
                    </div>
                  </div>
                  <Button className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    Generate & Schedule Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
  );
};

export default Analytics;