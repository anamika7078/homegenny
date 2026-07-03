"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, tokenStore } from '@/lib/api/client';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function computeResult(score: number): string {
  return score >= 70 ? 'PASS' : 'FAIL';
}

export default function SCCompetencyModule() {
  const [candidateId, setCandidateId] = useState('');
  const [competencyArea, setCompetencyArea] = useState('Patient Mobility');
  const [score, setScore] = useState('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScoreSubmit = async () => {
    setError(null);
    setSuccess(null);

    const numScore = Number(score);
    if (!candidateId.trim()) {
      setError('Candidate ID / Name is required.');
      return;
    }
    if (!score || isNaN(numScore) || numScore < 0 || numScore > 100) {
      setError('Please enter a valid score between 0 and 100.');
      return;
    }

    setLoading(true);
    try {
      const assessorId = tokenStore.getUserId() || undefined;

      // Step 1: Create the assessment record
      const created = await api.createAssessment({
        candidate_id: candidateId.trim(),
        assessment_type: 'SC',
        series: 'SC',
        status: 'PENDING',
        remarks: remarks.trim(),
        assessor_id: assessorId,
      });

      const assessmentId: string = created?.id ?? created?.data?.id;
      if (!assessmentId) throw new Error('Failed to create assessment record.');

      // Step 2: Submit with score + result
      const result = computeResult(numScore);
      await api.submitScAssessment({
        id: assessmentId,
        score: numScore,
        result,
        remarks: remarks.trim(),
        scenario_code: competencyArea,
        assessor_id: assessorId,
      });

      setSuccess(`Competency Assessment submitted successfully — Result: ${result}`);

      // Reset form
      setCandidateId('');
      setScore('');
      setRemarks('');
      setCompetencyArea('Patient Mobility');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const numScore = Number(score);
  const previewResult = score && !isNaN(numScore) ? computeResult(numScore) : null;

  return (
    <div className="page-padding space-y-6 sm:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Skilled Caretaker Competency Assessment</h1>
      
      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-500">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Competency Evaluation Form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Candidate ID / Name</label>
            <Input 
              placeholder="Enter Candidate ID" 
              className="mt-1" 
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Competency Area</label>
            <select 
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-1"
              value={competencyArea}
              onChange={(e) => setCompetencyArea(e.target.value)}
              disabled={loading}
            >
              <option value="Patient Mobility">Patient Mobility</option>
              <option value="Hygiene Protocol">Hygiene Protocol</option>
              <option value="Emergency Response">Emergency Response</option>
              <option value="Medication Handling">Medication Handling</option>
              <option value="Wound Care">Wound Care</option>
              <option value="Documentation">Documentation</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Score (0-100)</label>
            <Input 
              type="number" 
              placeholder="e.g. 85" 
              value={score} 
              onChange={(e) => setScore(e.target.value)} 
              className="mt-1"
              min={0}
              max={100}
              disabled={loading}
            />
            {previewResult && (
              <p className={`mt-1.5 text-xs font-semibold ${
                previewResult === 'PASS' ? 'text-green-500' : 'text-red-500'
              }`}>
                Auto-result: {previewResult} {previewResult === 'PASS' ? '✓' : '✗'} (threshold ≥ 70)
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Assessor Remarks</label>
            <Input 
              placeholder="Enter remarks" 
              className="mt-1" 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={loading}
            />
          </div>
        </CardContent>
        <div className="mt-6 flex justify-end px-6 pb-6">
          <Button onClick={handleScoreSubmit} disabled={loading} className="min-w-[160px]">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </span>
            ) : (
              'Submit Competency'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
