/**
 * 全局提示组件
 * 统一的 Toast 提示，显示在页面顶部
 */
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './Toast.css'

type ToastType = 'success' | 'error' | 'warning' | 'info'

let container: HTMLDivElement | null = null
let root: any = null

/**
 * 显示 Toast 提示
 */
export const toast = {
  success: (content: string, duration = 3000) => {
    showToastMessage('success', content, duration)
  },
  error: (content: string, duration = 3000) => {
    showToastMessage('error', content, duration)
  },
  warning: (content: string, duration = 3000) => {
    showToastMessage('warning', content, duration)
  },
  info: (content: string, duration = 3000) => {
    showToastMessage('info', content, duration)
  },
}

function showToastMessage(type: ToastType, content: string, duration: number) {
  // 确保容器存在
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
    root = createRoot(container)
  }

  // 渲染 Toast
  root.render(
    <ToastItem
      type={type}
      content={content}
      duration={duration}
      onClose={() => {
        // 移除 Toast
        root.render(null)
      }}
    />
  )
}

interface ToastItemProps {
  type: ToastType
  content: string
  duration: number
  onClose: () => void
}

const ToastItem: React.FC<ToastItemProps> = ({ type, content, duration, onClose }) => {
  const [visible, setVisible] = useState(false)

  React.useEffect(() => {
    // 延迟显示，触发动画
    setTimeout(() => setVisible(true), 10)

    // 自动关闭
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300) // 等待动画完成
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  return (
    <div className={`toast toast-${type} ${visible ? 'toast-visible' : ''}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-content">{content}</span>
    </div>
  )
}

export default toast
