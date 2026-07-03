'use client';

import { RmPageHeader } from '@/components/rm/rm-page-header';
import { PipelineKanban } from '@/components/rm/pipeline-kanban';

export default function RmPipelinePage() {
  return (
    <div className="page-padding">
      <RmPageHeader
        title="Pipeline Board"
        description="FSM-validated drag workflow — transitions logged immutably"
      />
      <PipelineKanban />
    </div>
  );
}
