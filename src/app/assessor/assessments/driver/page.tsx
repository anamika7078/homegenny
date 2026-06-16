'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function computeResult(score: number): string {
  return score >= 70 ? 'PASS' : 'FAIL';
}

export default function DriverTestModule() {
  const [candidateId, setCandidateId] = useState('');
  const [score, setScore] = useState('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ message: string; autoTerminated?: boolean } | null>(null);
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
      // Step 1: Create the assessment record
      const created = await api.createAssessment({
        candidate_id: candidateId.trim(),
        assessment_type: 'DRIVER',
        series: 'DR',
        status: 'PENDING',
        remarks: remarks.trim(),
      });

      const assessmentId: string = created?.id ?? created?.data?.id;
      if (!assessmentId) throw new Error('Failed to create assessment record.');

      // Step 2: Submit with score + result
      const result = computeResult(numScore);
      const submitted = await api.submitDriverAssessment({
        id: assessmentId,
        score: numScore,
        result,
        remarks: remarks.trim(),
      });

      setSuccess({
        message: submitted?.autoTerminated
          ? submitted.message ?? 'Assessment submitted. Staff auto-terminated after 3 failed attempts.'
          : `Assessment submitted successfully — Result: ${result}`,
        autoTerminated: submitted?.autoTerminated,
      });

      // Reset form
      setCandidateId('');
      setScore('');
      setRemarks('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const numScore = Number(score);
  const previewResult = score && !isNaN(numScore) ? computeResult(numScore) : null;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Driver Practical Assessment</h1>

      {success && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
          success.autoTerminated
            ? 'border-danger/30 bg-danger/10 text-danger'
            : 'border-success/30 bg-success/10 text-success'
        }`}>
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success.message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Evaluation Form</CardTitle>
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
            <label className="text-sm font-medium">Practical Score (0–100)</label>
            <Input
              type="number"
              placeholder="e.g. 75"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="mt-1"
              min={0}
              max={100}
              disabled={loading}
            />
            {previewResult && (
              <p className={`mt-1.5 text-xs font-semibold ${
                previewResult === 'PASS' ? 'text-success' : 'text-danger'
              }`}>
                Auto-result: {previewResult} {previewResult === 'PASS' ? '✓' : '✗'} (threshold ≥ 70)
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Remarks</label>
            <Input
              placeholder="Enter any behavioral or practical remarks"
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
              'Submit Assessment'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
