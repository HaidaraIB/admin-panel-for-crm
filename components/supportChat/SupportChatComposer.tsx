import React, { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import LoadingSpinner from '../LoadingSpinner';
import { ChatMediaThumb } from '../chat/ChatMediaThumb';
import { useI18n } from '../../context/i18n';
import { useChatVoiceRecorder } from '../../hooks/useChatVoiceRecorder';
import { useToast } from '../../context/ToastContext';
import type { SupportChatAdminMessage } from '../../services/api';

type Props = {
  disabled?: boolean;
  sending?: boolean;
  replyTo?: SupportChatAdminMessage | null;
  onCancelReply?: () => void;
  onSend: (payload: { body: string; file?: File }) => Promise<void>;
};

function replySnippet(message: SupportChatAdminMessage, t: (key: string) => string): string {
  const cap = (message.body || '').replace(/\s+/g, ' ').trim();
  const kind = message.attachment_kind;
  let label = '';
  if (kind === 'image') label = t('supportChat.mediaPhoto');
  else if (kind === 'video') label = t('supportChat.mediaVideo');
  else if (kind === 'audio') label = t('supportChat.mediaAudio');
  else if (kind === 'document') label = t('supportChat.mediaDocument');
  if (label && cap) return `${label} · ${cap}`;
  if (cap) return cap;
  return label;
}

function PendingFileChip({
  file,
  onClear,
  clearLabel,
}: {
  file: File;
  onClear: () => void;
  clearLabel: string;
}) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage && !isVideo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage, isVideo]);

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm dark:border-gray-500 dark:bg-gray-800">
      {previewUrl ? (
        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-black/30">
          {isImage ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              <video src={previewUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                <Icon name="play" className="h-3.5 w-3.5 text-white" />
              </span>
            </>
          )}
        </span>
      ) : (
        <Icon name="paperclip" className="h-4 w-4 shrink-0 text-gray-500" />
      )}
      <span className="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-gray-50">{file.name}</span>
      <button
        type="button"
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-black/10 dark:text-gray-200 dark:hover:bg-white/10"
        onClick={onClear}
        aria-label={clearLabel}
      >
        ×
      </button>
    </div>
  );
}

const iconBtnClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700/80';

export const SupportChatComposer: React.FC<Props> = ({
  disabled,
  sending,
  replyTo,
  onCancelReply,
  onSend,
}) => {
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const voice = useChatVoiceRecorder({
    enabled: !disabled && !sending,
    busy: sending,
    onRecordingComplete: (file) => setPendingFile(file),
    onMicDenied: () => showToast(t('supportChat.micDenied'), { variant: 'error' }),
  });

  const handleSend = async () => {
    const body = text.trim();
    if (!body && !pendingFile) return;
    try {
      await onSend({ body, file: pendingFile ?? undefined });
      setText('');
      setPendingFile(null);
      onCancelReply?.();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch {
      showToast(t('supportChat.sendFailed'), { variant: 'error' });
    }
  };

  const canSend = Boolean(text.trim() || pendingFile);

  const snippet = replyTo ? replySnippet(replyTo, t) : '';

  return (
    <div className="space-y-2">
      {replyTo ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary-400/50 bg-primary-50 px-3 py-2 dark:border-primary-500/40 dark:bg-primary-950/40">
          {replyTo.attachment_url &&
          (replyTo.attachment_kind === 'image' || replyTo.attachment_kind === 'video') ? (
            <div className="size-11 shrink-0 overflow-hidden rounded-lg">
              <ChatMediaThumb
                url={replyTo.attachment_url}
                kind={replyTo.attachment_kind}
                className="size-full"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
              {t('supportChat.replyingTo')}
            </p>
            <p className="truncate text-sm text-gray-800 dark:text-gray-50">
              <span>{replyTo.display_name || t('supportChat.title')}</span>
              {snippet ? (
                <>
                  <span className="text-gray-500 dark:text-gray-300"> · </span>
                  <span>{snippet}</span>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-black/10 dark:text-gray-200 dark:hover:bg-white/10"
            aria-label={t('supportChat.cancelReply')}
          >
            ×
          </button>
        </div>
      ) : null}
      {pendingFile ? (
        <PendingFileChip
          file={pendingFile}
          onClear={() => setPendingFile(null)}
          clearLabel={t('supportChat.removeAttachment')}
        />
      ) : null}

      {voice.voiceRecording ? (
        <div
          className="flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/30"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 ${voice.voicePaused ? 'opacity-40' : 'animate-pulse'}`}
            aria-hidden
          />
          <span dir="ltr" className="min-w-[3rem] tabular-nums text-sm font-medium text-red-600 dark:text-red-400">
            {voice.elapsedLabel}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-gray-600 dark:text-gray-400">
            {voice.voicePaused ? t('supportChat.recordingPaused') : t('supportChat.recording')}
          </span>
          <button
            type="button"
            className={iconBtnClass}
            onClick={voice.cancelVoiceRecording}
            aria-label={t('supportChat.cancelRecording')}
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={iconBtnClass}
            onClick={() => (voice.voicePaused ? voice.resumeVoiceRecording() : voice.pauseVoiceRecording())}
            aria-label={voice.voicePaused ? t('supportChat.resumeRecording') : t('supportChat.pauseRecording')}
          >
            <Icon name={voice.voicePaused ? 'play' : 'pause'} className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
            onClick={voice.stopVoiceRecording}
          >
            {t('supportChat.stopRecording')}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
            }}
            rows={1}
            disabled={disabled || sending}
            placeholder={t('supportChat.placeholder')}
            className="flex-1 min-h-10 max-h-28 min-w-0 resize-none rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm leading-5 text-gray-900 placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPendingFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={disabled || sending}
            onClick={() => fileRef.current?.click()}
            className={iconBtnClass}
            aria-label={t('supportChat.attachFile')}
            title={t('supportChat.attachFile')}
          >
            <Icon name="paperclip" className="h-[1.125rem] w-[1.125rem]" />
          </button>
          <button
            type="button"
            disabled={disabled || sending}
            onClick={() => void voice.startVoiceRecording()}
            className={iconBtnClass}
            aria-label={t('supportChat.recordVoice')}
            title={t('supportChat.recordVoice')}
          >
            <Icon name="microphone" className="h-[1.125rem] w-[1.125rem]" />
          </button>
          <button
            type="button"
            disabled={disabled || sending || !canSend}
            onClick={() => void handleSend()}
            aria-label={t('supportChat.send')}
            title={t('supportChat.send')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? (
              <LoadingSpinner size="sm" tone="light" presentational />
            ) : (
              <Icon name="send" className="h-5 w-5 rtl:-scale-x-100" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};
