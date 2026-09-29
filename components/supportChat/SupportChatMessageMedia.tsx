import React, { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../context/i18n';
import { ChatVoicePlayer } from '../chat/ChatVoicePlayer';
import { fetchChatMediaObjectUrl } from '../../utils/chatMediaAuthBlob';

type Props = {
  url: string;
  kind: 'image' | 'video' | 'audio' | 'document';
  mine: boolean;
  filename?: string | null;
  onOpen?: () => void;
};

export const SupportChatMessageMedia: React.FC<Props> = ({ url, kind, mine, filename, onOpen }) => {
  const { t } = useI18n();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    setFailed(false);
    setSrc(null);
    void fetchChatMediaObjectUrl(url)
      .then((u) => {
        objectUrl = u;
        setSrc(u);
      })
      .catch(() => setFailed(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (kind === 'document') {
    const rawName = (filename || '').trim();
    const docName = rawName || t('supportChat.mediaDocument');
    const dot = rawName.lastIndexOf('.');
    const ext = dot > 0 && dot < rawName.length - 1 ? rawName.slice(dot + 1).toUpperCase() : '';
    const ready = Boolean(src) && !failed;
    const meta = failed
      ? t('supportChat.mediaFailed')
      : !ready
        ? t('common.loading')
        : ext || t('chatMediaDownload');
    return (
      <a
        href={ready ? src! : undefined}
        download={ready ? docName : undefined}
        onClick={ready ? undefined : (e) => e.preventDefault()}
        aria-disabled={ready ? undefined : true}
        aria-label={ready ? `${docName}. ${t('chatMediaDownload')}` : docName}
        className={`flex w-full min-w-[11rem] items-center gap-2.5 rounded-md px-2 py-1.5 no-underline ${
          mine
            ? 'bg-black/10 text-white'
            : 'bg-black/[0.04] text-gray-900 dark:bg-white/5 dark:text-gray-50'
        }`}
      >
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-md ${
            mine ? 'bg-white/20' : 'bg-primary-500/15 text-primary-700 dark:text-primary-200'
          }`}
        >
          <Icon name="pdf" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium" dir="auto">
            {docName}
          </span>
          <span
            className={`block truncate text-[11px] ${
              mine ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
            }`}
            dir="auto"
          >
            {meta}
          </span>
        </span>
        {ready ? <Icon name="download" className="h-4 w-4 shrink-0 opacity-80" /> : null}
      </a>
    );
  }

  if (failed) {
    return (
      <p className={`text-xs ${mine ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
        {t('supportChat.mediaFailed')}
      </p>
    );
  }

  if (!src) {
    return (
      <p className={`text-xs ${mine ? 'text-white/70' : 'text-gray-400'}`}>{t('common.loading')}</p>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="mb-1 w-full min-w-0">
        <ChatVoicePlayer blobUrl={src} mine={mine} t={t} />
      </div>
    );
  }

  const visualFrameClass = `relative w-full min-w-[12rem] max-h-52 aspect-[4/3] overflow-hidden rounded-lg ${
    mine
      ? 'bg-white/10'
      : 'bg-gradient-to-br from-gray-200/90 to-gray-300/80 dark:from-gray-700/80 dark:to-gray-800/70'
  }`;

  if (kind === 'image') {
    const img = (
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />
    );
    const frame = <div className={visualFrameClass}>{img}</div>;
    if (onOpen) {
      return (
        <button
          type="button"
          onClick={onOpen}
          className="mb-1 block w-full min-w-0 cursor-zoom-in border-0 bg-transparent p-0 text-start"
          aria-label={t('chatMediaOpenAria')}
        >
          {frame}
        </button>
      );
    }
    return frame;
  }

  if (kind === 'video') {
    const inner = (
      <div className={visualFrameClass}>
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white">
            <Icon name="play" className="h-5 w-5 ms-0.5" />
          </span>
        </span>
      </div>
    );
    if (onOpen) {
      return (
        <button
          type="button"
          onClick={onOpen}
          className="mb-1 block w-full min-w-0 cursor-pointer border-0 bg-transparent p-0"
          aria-label={t('chatMediaOpenAria')}
        >
          {inner}
        </button>
      );
    }
    return inner;
  }

  return null;
};
