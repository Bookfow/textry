'use client'

import { useRef, useEffect } from 'react'
import { Bold, Italic, Underline, Palette } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

export default function RichTextEditor({ value, onChange, placeholder = '', minHeight = '100px' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInitialized = useRef(false)
  const colorInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value || ''
      isInitialized.current = true
    }
  }, [value])

  useEffect(() => {
    return () => { isInitialized.current = false }
  }, [])

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  const prevent = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-wrap">
        <button type="button" onMouseDown={prevent} onClick={() => execCmd('bold')}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300" title="볼드">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" onMouseDown={prevent} onClick={() => execCmd('italic')}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300" title="이탤릭">
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" onMouseDown={prevent} onClick={() => execCmd('underline')}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300" title="밑줄">
          <Underline className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        <select
          onChange={(e) => { execCmd('fontSize', e.target.value); e.target.value = '3' }}
          defaultValue="3"
          className="text-xs px-1 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
        >
          <option value="1">작게</option>
          <option value="3">보통</option>
          <option value="5">크게</option>
          <option value="7">아주 크게</option>
        </select>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button type="button" onMouseDown={prevent} onClick={() => colorInputRef.current?.click()}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300" title="글자색">
          <Palette className="w-3.5 h-3.5" />
        </button>
        <input ref={colorInputRef} type="color" className="sr-only" onChange={(e) => execCmd('foreColor', e.target.value)} />
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="px-3 py-2 text-sm focus:outline-none text-gray-900 dark:text-white [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400"
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  )
}
