import { createSender } from 'statocysts'

export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

export interface CreateMessageCollectorOptions {
  notificationUrls?: string | string[]
  serverChanSendKey?: string | string[]
  onError?: () => void
}

export interface CollectOptions {
  output?: boolean // Whether to output to console (default: false)
  isError?: boolean // Whether this is an error message (default: false)
}

export interface MessageCollector {
  // Console only (不收集到通知)
  log: (message: string) => void
  error: (message: string) => void

  // Notification only (不输出到控制台)
  notify: (message: string) => void
  notifyError: (message: string) => void

  // Console + Notification (同时输出和收集)
  info: (message: string) => void
  infoError: (message: string) => void

  // Utility
  push: () => Promise<void>
  hasError: () => boolean

  /** @deprecated Use notify(), info(), or notifyError() instead */
  collect: (message: string, options?: CollectOptions) => void
}

export function createMessageCollector(options: CreateMessageCollectorOptions): MessageCollector {
  const messages: string[] = []
  let hasError = false

  const log = (message: string) => {
    console.log(message)
  }

  const error = (message: string) => {
    console.error(message)
    hasError = true
  }

  // Notification only methods
  const notify = (message: string) => {
    messages.push(message)
  }

  const notifyError = (message: string) => {
    messages.push(message)
    hasError = true
  }

  // Combined methods (Console + Notification)
  const info = (message: string) => {
    console.log(message)
    messages.push(message)
  }

  const infoError = (message: string) => {
    console.error(message)
    messages.push(message)
    hasError = true
  }

  /** @deprecated Use notify(), info(), or notifyError() instead */
  const collect = (message: string, opts: CollectOptions = {}) => {
    const { output = false, isError = false } = opts

    // Add to notification messages
    messages.push(message)

    // Output to console if requested
    if (output) {
      console[isError ? 'error' : 'log'](message)
    }

    // Mark as error if needed
    if (isError) {
      hasError = true
    }
  }

  const push = async () => {
    // 检查是否有消息需要发送
    if (messages.length === 0) {
      return
    }

    const title = '【森空岛每日签到】'
    const content = messages.join('\n\n')
    const urls = options.notificationUrls ? toArray(options.notificationUrls) : []
    const sendKeys = options.serverChanSendKey ? toArray(options.serverChanSendKey) : []

    // 检查是否有配置任何通知渠道
    if (urls.length === 0 && sendKeys.length === 0) {
      return
    }

    const sender = createSender(urls)
    await sender.send(title, content)

    // Send via Server酱 Turbo if configured
    for (const sendKey of sendKeys) {
      if (!sendKey)
        continue
      try {
        const res = await fetch(`https://sct.ftqq.com/${sendKey}.send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, desp: content }),
        })
        if (!res.ok) {
          console.error(`Server酱 Turbo 推送失败: HTTP ${res.status}`)
        }
      }
      catch (err) {
        console.error(`Server酱 Turbo 推送失败: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // Exit with error if any error occurred
    if (hasError && options.onError) {
      options.onError()
    }
  }

  return { log, error, notify, notifyError, info, infoError, collect, push, hasError: () => hasError } as const
}
