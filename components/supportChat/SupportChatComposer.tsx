import React, { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { ChatMediaThumb } from '../chat/ChatMediaThumb';
import { useI18n } from '../../context/i18n';
import { inputTextDir } from '../../utils/inputAutoDir';
import { useChatVoiceRecorder } from '../../hooks/useChatVoiceRecorder';
import { useToast } from '../../context/ToastContext';
import type { SupportChatAdminMessage } from '../../services/api';

type Props = {
  disabled?: boolean;
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
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800';

const voiceBtnClass =
  'flex size-10 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/80';

export const SupportChatComposer: React.FC<Props> = ({
  disabled,
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
    enabled: !disabled,
    onRecordingComplete: (file) => setPendingFile(file),
    onMicDenied: () => showToast(t('supportChat.micDenied'), { variant: 'error' }),
  });

  const handleSend = () => {
    const body = text.trim();
    const file = pendingFile ?? undefined;
    if (disabled || (!body && !file)) return;
    setText('');
    setPendingFile(null);
    onCancelReply?.();
    void onSend({ body, file }).catch(() => {
      setText((current) => (current.trim() ? current : body));
      if (file) setPendingFile((current) => current ?? file);
      showToast(t('supportChat.sendFailed'), { variant: 'error' });
    });
  };

  const syncTextareaHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    const maxPx = 112;
    el.style.height = '0px';
    el.style.height = `${Math.max(Math.min(el.scrollHeight, maxPx), 40)}px`;
  };

  useEffect(() => {
    syncTextareaHeight(textareaRef.current);
  }, [text]);

  const canSend = Boolean(text.trim() || pendingFile);

  const snippet = replyTo ? replySnippet(replyTo, t) : '';

  const isRtl = language === 'ar';

  return (
    <div className="space-y-2 shrink-0">
      <style>{`
        textarea.support-chat-composer-input,
        textarea.support-chat-composer-input:focus,
        textarea.support-chat-composer-input:hover {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        textarea.support-chat-composer-input::-webkit-scrollbar,
        textarea.support-chat-composer-input::-webkit-scrollbar-thumb,
        textarea.support-chat-composer-input::-webkit-scrollbar-track,
        textarea.support-chat-composer-input::-webkit-scrollbar-button,
        textarea.support-chat-composer-input::-webkit-scrollbar-corner {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
          background: transparent !important;
          appearance: none !important;
          -webkit-appearance: none !important;
        }
      `}</style>
      {replyTo ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary-500/40 bg-primary-500/[0.08] px-3 py-2 dark:border-primary-500/50 dark:bg-primary-500/25">
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
            className="shrink-0 rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-black/10 dark:text-gray-200 dark:hover:bg-white/10"
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
          className="flex min-h-10 min-w-0 flex-1 items-center gap-2 px-1"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <span
            className={`size-2.5 shrink-0 rounded-full bg-red-500 ${voice.voicePaused ? 'opacity-40' : 'animate-pulse'}`}
            aria-hidden
          />
          <span
            dir="ltr"
            className="min-w-[3rem] tabular-nums text-sm font-medium text-red-600 dark:text-red-400 [unicode-bidi:isolate]"
          >
            {voice.elapsedLabel}
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-xs text-gray-500 dark:text-gray-400 ${
              isRtl ? 'text-right' : 'text-left'
            }`}
          >
            {voice.voicePaused ? t('supportChat.recordingPaused') : t('supportChat.recording')}
          </span>
          <button
            type="button"
            className={voiceBtnClass}
            onClick={voice.cancelVoiceRecording}
            aria-label={t('supportChat.cancelRecording')}
            title={t('supportChat.cancelRecording')}
          >
            <span className="text-lg leading-none" aria-hidden>×</span>
          </button>
          <button
            type="button"
            className={voiceBtnClass}
            onClick={() => (voice.voicePaused ? voice.resumeVoiceRecording() : voice.pauseVoiceRecording())}
            aria-label={voice.voicePaused ? t('supportChat.resumeRecording') : t('supportChat.pauseRecording')}
            title={voice.voicePaused ? t('supportChat.resumeRecording') : t('supportChat.pauseRecording')}
          >
            <Icon name={voice.voicePaused ? 'play' : 'pause'} className="h-[1.15rem] w-[1.15rem]" />
          </button>
          <button
            type="button"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            onClick={voice.stopVoiceRecording}
            aria-label={t('supportChat.stopRecording')}
            title={t('supportChat.stopRecording')}
          >
            <span className="inline-block size-[1.05rem] rounded-sm bg-white" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5" dir="ltr">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            disabled={disabled}
            placeholder={t('supportChat.placeholder')}
            dir={inputTextDir(text, isRtl)}
            className="support-chat-composer-input flex-1 min-h-10 max-h-28 min-w-0 resize-none overflow-y-auto rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm leading-5 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/80 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              textAlign: inputTextDir(text, isRtl) === 'rtl' ? 'right' : 'left',
            }}
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
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            className={iconBtnClass}
            aria-label={t('supportChat.attachFile')}
            title={t('supportChat.attachFile')}
          >
            <Icon name="paperclip" className="h-[1.125rem] w-[1.125rem]" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void voice.startVoiceRecording()}
            className={iconBtnClass}
            aria-label={t('supportChat.recordVoice')}
            title={t('supportChat.recordVoice')}
          >
            <Icon name="microphone" className="h-[1.125rem] w-[1.125rem]" />
          </button>
          <button
            type="button"
            disabled={disabled || !canSend}
            onClick={() => void handleSend()}
            aria-label={t('supportChat.send')}
            title={t('supportChat.send')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-md shadow-primary-500/25 transition-colors hover:bg-primary-500/90 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
          >
            <Icon name="send" className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};
