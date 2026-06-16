"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPipelinePage() {
  const [pipelineData, setPipelineData] = useState([]);

  useEffect(() => {
    // Fetch pipeline data
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Pipeline FSM Monitoring</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Pipeline Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Pipeline overview goes here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
