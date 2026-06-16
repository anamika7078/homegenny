'use client';

import { RmPageHeader } from '@/components/rm/rm-page-header';
import { PipelineKanban } from '@/components/rm/pipeline-kanban';

export default function RmPipelinePage() {
  return (
    <div className="p-6">
      <RmPageHeader
        title="Pipeline Board"
        description="FSM-validated drag workflow — transitions logged immutably"
      />
      <PipelineKanban />
    </div>
  );
}
