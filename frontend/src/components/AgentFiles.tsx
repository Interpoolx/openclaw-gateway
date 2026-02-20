import React, { useState } from 'react';
import {
  FileText,
  Save,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface AgentFilesProps {
  readonly agentId: string;
  readonly isDemo?: boolean;
}

const fileIcons: Record<string, React.ReactNode> = {
  'SOUL.md': <FileText size={16} />,
  'IDENTITY.md': <FileText size={16} />,
  'HEARTBEAT.md': <FileText size={16} />,
  'USER.md': <FileText size={16} />,
  'MEMORY.md': <FileText size={16} />,
  'AGENTS.md': <FileText size={16} />,
  'TOOLS.md': <FileText size={16} />,
};

const fileColors: Record<string, string> = {
  'SOUL.md': '#ef4444',
  'IDENTITY.md': '#3b82f6',
  'HEARTBEAT.md': '#22c55e',
  'USER.md': '#f59e0b',
  'MEMORY.md': '#8b5cf6',
  'AGENTS.md': '#06b6d4',
  'TOOLS.md': '#84cc16',
};

const fileDescriptions: Record<string, string> = {
  'SOUL.md': 'Core personality and essence',
  'IDENTITY.md': 'Agent identity and capabilities',
  'HEARTBEAT.md': 'Health status and activity logs',
  'USER.md': 'User context and preferences',
  'MEMORY.md': 'Knowledge and learned patterns',
  'AGENTS.md': 'Sub-agent configurations',
  'TOOLS.md': 'Tool definitions and capabilities',
};

const defaultFileTemplates: Record<string, string> = {
  'SOUL.md': `# Agent Soul

## Essence
This file contains the core personality and essence of the agent.

## Core Values
- Integrity: Always act with honesty and transparency
- Curiosity: Continuously learn and explore
- Empathy: Understand and consider user perspectives

## Personality Traits
- Tone: Professional yet approachable
- Style: Clear and concise communication
- Approach: Solution-oriented thinking

## Purpose
[Define the agent's primary purpose and mission]

## Principles
1. Prioritize user safety and privacy
2. Provide accurate and helpful information
3. Acknowledge limitations when uncertain
4. Continuously improve through feedback
`,
  'IDENTITY.md': `# Agent Identity

## Basic Information
- Name: [Agent Name]
- Role: [Agent Role]
- Level: [junior/specialist/lead]
- Model: [AI Model]

## Capabilities
- [List key capabilities and skills]

## Specializations
- [List areas of expertise]

## Background
[Agent background story and context]

## Communication Style
- Formal/Informal: [Choice]
- Technical Level: [Beginner/Intermediate/Advanced]
- Language Preferences: [List languages]

## Boundaries
- What the agent can do
- What the agent cannot do
- When to escalate to human
`,
  'HEARTBEAT.md': `# Agent Heartbeat

## Status Log

### Latest Check-in
- Timestamp: [Auto-updated]
- Status: [active/idle/busy/offline]
- Health: [healthy/warning/critical]

## Performance Metrics
- Tasks Completed: [Count]
- Success Rate: [Percentage]
- Average Response Time: [Time]

## System Health
- CPU Usage: [Percentage]
- Memory Usage: [Percentage]
- Last Error: [Timestamp or "None"]

## Activity Log
| Timestamp | Event | Details |
|-----------|-------|---------|
| [Time] | [Event] | [Details] |

## Alerts
- [List any active alerts or warnings]
`,
  'USER.md': `# User Context

## Primary User
- User ID: [User ID]
- Name: [User Name]
- Preferences: [Key preferences]

## Interaction History
### Recent Conversations
- [Summary of recent interactions]

## User Preferences
- Communication Style: [Preferred style]
- Technical Level: [User's technical expertise]
- Response Length: [Brief/Detailed]

## Context Notes
- Important facts about the user
- Recurring topics of interest
- Previous issues and resolutions

## Access Permissions
- [What the agent can access for this user]
`,
  'MEMORY.md': `# Agent Memory

## Short-term Memory
[Recent context and active conversation threads]

## Long-term Memory
### Key Facts
- [Important facts learned]

### Learned Patterns
- [Behavioral patterns observed]

### Preferences Over Time
- [How preferences have evolved]

## Knowledge Base
### Domain Knowledge
- [Specific domain expertise]

### Procedures
- [Standard operating procedures]

### Connections
- [Relationships between concepts]

## Memory Triggers
- Keywords that recall specific memories
- Contexts that activate certain knowledge
`,
  'AGENTS.md': `# Sub-Agents Configuration

## Overview
This file defines sub-agents that this agent can spawn or delegate tasks to.

## Sub-Agent Definitions

### [Sub-Agent Name]
- ID: [unique-id]
- Role: [Role description]
- Capabilities: [What this sub-agent can do]
- Model: [AI model to use]
- MaxTokens: [Maximum tokens per response]

## Delegation Rules
- When to delegate to sub-agents
- Task routing logic
- Fallback behavior

## Coordination
- How sub-agents communicate
- Shared context management
- Result aggregation
`,
  'TOOLS.md': `# Tools Configuration

## Overview
This file defines custom tools and tool configurations for this agent.

## Built-in Tools
The agent has access to the following built-in tools:
- read: Read files from disk
- write: Create new files
- edit: Modify existing files
- exec: Run shell commands
- session_status: Check session status

## Custom Tools

### [Tool Name]
- Description: [What the tool does]
- Parameters: [Input parameters]
- Returns: [Output format]
- Implementation: [How it's called]

## Tool Permissions
- Which tools are enabled
- Usage limits per session
- Security restrictions
`,
};

export function AgentFiles({ isDemo }: AgentFilesProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const allFilenames = Object.keys(defaultFileTemplates);

  return (
    <div style={{
      display: 'flex',
      height: '600px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '20px',
      overflow: 'hidden',
      backdropFilter: 'blur(10px)'
    }}>
      {/* Sidebar */}
      <div style={{
        width: isSidebarCollapsed ? '56px' : '240px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRight: '1px solid rgba(255, 255, 255, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
        }}>
          {!isSidebarCollapsed && (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#666',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Agent Files
            </span>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* File List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {allFilenames.map((filename) => (
            <button
              key={filename}
              onClick={() => {
                setSelectedFile(filename);
                setEditorContent(defaultFileTemplates[filename]);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: isSidebarCollapsed ? '12px' : '12px 14px',
                background: selectedFile === filename ? 'rgba(245, 157, 10, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                color: selectedFile === filename ? '#fff' : '#888',
                fontSize: '13px',
                textAlign: 'left',
                marginBottom: '4px',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{
                color: fileColors[filename],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {fileIcons[filename]}
              </span>
              {!isSidebarCollapsed && (
                <span style={{ fontWeight: selectedFile === filename ? 500 : 400 }}>
                  {filename}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* File Description */}
        {!isSidebarCollapsed && selectedFile && (
          <div style={{
            padding: '12px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}>
            {fileDescriptions[selectedFile]}
          </div>
        )}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={18} color="var(--text-muted)" />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>
              {selectedFile || 'Select a file'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Save Status */}
            {saveStatus !== 'idle' && (
              <span style={{
                fontSize: '12px',
                color: saveStatus === 'saved' ? 'var(--accent-green)' :
                  saveStatus === 'error' ? '#ef4444' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                {saveStatus === 'saving' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                {saveStatus === 'saved' && <Check size={14} />}
                {saveStatus === 'error' && <AlertCircle size={14} />}
                {saveStatus === 'saving' ? 'Saving...' :
                  saveStatus === 'saved' ? 'Saved' :
                    saveStatus === 'error' ? 'Error' : ''}
              </span>
            )}

            {/* Reset Button */}
            <button
              onClick={() => {
                if (selectedFile && window.confirm(`Reset ${selectedFile} to default template? This will lose all custom changes.`)) {
                  setEditorContent(defaultFileTemplates[selectedFile]);
                }
              }}
              disabled={isDemo}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: isDemo ? 'not-allowed' : 'pointer',
                opacity: isDemo ? 0.5 : 1,
              }}
              title="Reset to default template"
            >
              <RotateCcw size={14} />
              Reset
            </button>

            {/* Save Button */}
            <button
              onClick={() => setSaveStatus('saved')}
              disabled={isDemo}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'var(--accent-orange)',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isDemo ? 'not-allowed' : 'pointer',
                opacity: isDemo ? 0.5 : 1,
              }}
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div style={{ flex: 1, display: 'flex' }}>
          {/* Line Numbers */}
          <div style={{
            width: '48px',
            background: 'var(--bg-darker)',
            padding: '12px 8px',
            textAlign: 'right',
            fontSize: '13px',
            lineHeight: '20px',
            color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace',
            overflow: 'hidden',
            userSelect: 'none',
          }}>
            {editorContent.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Text Area */}
          <textarea
            value={editorContent}
            onChange={(e) => {
              setEditorContent(e.target.value);
              if (saveStatus === 'saved') setSaveStatus('idle');
            }}
            disabled={isDemo || !selectedFile}
            placeholder={selectedFile ? `Edit ${selectedFile}...` : 'Select a file to edit'}
            style={{
              flex: 1,
              padding: '16px 20px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: 'none',
              color: '#fff',
              fontSize: '13px',
              lineHeight: '22px',
              fontFamily: 'JetBrains Mono, monospace',
              resize: 'none',
              outline: 'none',
              whiteSpace: 'pre',
              overflowWrap: 'normal',
              overflowX: 'auto',
            }}
            spellCheck={false}
          />
        </div>

        {/* Status Bar */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#666',
          background: 'rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>{editorContent.length} characters</span>
            <span>{editorContent.split('\n').length} lines</span>
          </div>
          {isDemo && (
            <span style={{ color: '#f59e0b' }}>Demo mode - Read only</span>
          )}
        </div>
      </div>
    </div>
  );
}
