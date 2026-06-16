"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminQueuesPage() {
  const [queues, setQueues] = useState([]);

  useEffect(() => {
    // Fetch queue status
  }, []);

  return (
    <div className="p-8 space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">Queue Monitoring (BullMQ)</h1>
        <Button variant="outline" className="border-border/60 hover:bg-[#1C2740] hover:text-white transition-all text-[#8D9AB5] bg-transparent">Retry Failed Jobs</Button>
      </div>

      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="pb-6 border-b border-border/40">
          <CardTitle className="text-xl font-bold text-[#E8EDF8]">Job Queues</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-sm text-[#8D9AB5]">
            Queue statuses go here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
