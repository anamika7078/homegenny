"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminVideoCertificationsPage() {
  const [certs, setCerts] = useState([]);

  useEffect(() => {
    // Fetch certs
  }, []);

  return (
    <div className="p-8 space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">Video Certifications</h1>
      </div>

      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="pb-6 border-b border-border/40">
          <CardTitle className="text-xl font-bold text-[#E8EDF8]">Global Certifications & Integrity Monitoring</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-sm text-[#8D9AB5]">
            Certification compliance details go here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
