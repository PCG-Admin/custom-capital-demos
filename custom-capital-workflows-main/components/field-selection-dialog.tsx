'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X, Info, ChevronDown, ChevronRight } from 'lucide-react'
import {
  APPLICATION_FIELD_DEFINITIONS,
  getFieldsByCategory,
  FieldHints,
  getDefaultFieldHints,
} from '@/lib/extraction-fields'

interface FieldSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (fieldHints: FieldHints) => Promise<void>
  initialFieldHints?: FieldHints | null
  supplierName: string
  extractedData?: any
}

export function FieldSelectionDialog({
  open,
  onOpenChange,
  onSave,
  initialFieldHints,
  supplierName,
  extractedData,
}: FieldSelectionDialogProps) {
  const [fieldHints, setFieldHints] = useState<FieldHints>(
    initialFieldHints || getDefaultFieldHints()
  )
  const [saving, setSaving] = useState(false)
  const [fieldNoteInputs, setFieldNoteInputs] = useState<Record<string, string>>({})
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const fieldsByCategory = getFieldsByCategory()

  // Initialize field hints from initial value or defaults
  useEffect(() => {
    if (open) {
      const hints = initialFieldHints || getDefaultFieldHints()
      setFieldHints(hints)
      setFieldNoteInputs(hints.field_notes || {})
      // Expand all categories by default, including Supplier-Specific Fields if present
      const categories = new Set(Object.keys(fieldsByCategory))
      if (hints.dynamic_fields && Object.keys(hints.dynamic_fields).length > 0) {
        categories.add('Supplier-Specific Fields')
      }
      setExpandedCategories(categories)
    }
  }, [open, initialFieldHints])

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const toggleEnabledField = (fieldKey: string) => {
    setFieldHints(prev => {
      const enabled = prev.enabled_fields.includes(fieldKey)
      const newEnabledFields = enabled
        ? prev.enabled_fields.filter(k => k !== fieldKey)
        : [...prev.enabled_fields, fieldKey]

      return {
        ...prev,
        enabled_fields: newEnabledFields,
      }
    })
  }

  const updateFieldNote = (fieldKey: string, note: string) => {
    setFieldNoteInputs(prev => ({ ...prev, [fieldKey]: note }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const cleanedNotes: Record<string, string> = {}
      for (const [key, value] of Object.entries(fieldNoteInputs)) {
        if (value.trim()) {
          cleanedNotes[key] = value.trim()
        }
      }

      await onSave({
        ...fieldHints,
        field_notes: cleanedNotes,
      })
    } finally {
      setSaving(false)
    }
  }

  const isFieldExtracted = (fieldKey: string): boolean => {
    if (!extractedData) return false
    const fieldDef = APPLICATION_FIELD_DEFINITIONS.find(f => f.key === fieldKey)
    if (!fieldDef) return false
    const value = extractedData[fieldDef.schemaKey]
    return value !== undefined && value !== null && value !== 'N/A' && value !== ''
  }

  const selectAll = () => {
    setFieldHints(prev => ({
      ...prev,
      enabled_fields: APPLICATION_FIELD_DEFINITIONS.map(f => f.key),
    }))
  }

  const selectExtractedOnly = () => {
    if (!extractedData) return
    const extractedFields = APPLICATION_FIELD_DEFINITIONS
      .filter(f => isFieldExtracted(f.key))
      .map(f => f.key)
    setFieldHints(prev => ({
      ...prev,
      enabled_fields: extractedFields,
    }))
  }

  const deselectAll = () => {
    setFieldHints(prev => ({
      ...prev,
      enabled_fields: [],
    }))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-70" onClick={() => !saving && onOpenChange(false)} />

      {/* Dialog */}
      <div className="relative z-50 bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden m-4 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Configure Field Template for {supplierName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select which fields this supplier&apos;s forms include. All fields are treated as equally important for extraction.
            </p>
          </div>
          <button
            onClick={() => !saving && onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="bg-gray-50 border-b px-6 py-3 flex items-center gap-2">
          <Button onClick={selectAll} variant="outline" size="sm" type="button">
            Select All
          </Button>
          {extractedData && (
            <Button onClick={selectExtractedOnly} variant="outline" size="sm" type="button">
              Select Extracted Only
            </Button>
          )}
          <Button onClick={deselectAll} variant="outline" size="sm" type="button">
            Deselect All
          </Button>
          <div className="flex-1" />
          <div className="text-sm text-gray-600">
            {fieldHints.enabled_fields.length} predefined fields
            {fieldHints.dynamic_fields && Object.keys(fieldHints.dynamic_fields).length > 0 && (
              <span className="ml-2 text-purple-600 font-medium">
                + {Object.keys(fieldHints.dynamic_fields).length} custom
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Dynamic Supplier-Specific Fields Section */}
            {fieldHints.dynamic_fields && Object.keys(fieldHints.dynamic_fields).length > 0 && (
              <div className="border rounded-lg border-purple-300 bg-purple-50/30">
                <button
                  type="button"
                  onClick={() => toggleCategory('Supplier-Specific Fields')}
                  className="w-full flex items-center justify-between p-4 hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedCategories.has('Supplier-Specific Fields') ? (
                      <ChevronDown className="h-4 w-4 text-purple-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-purple-600" />
                    )}
                    <span className="font-semibold text-sm text-purple-900">Supplier-Specific Fields</span>
                    <Badge variant="secondary" className="text-xs bg-purple-200 text-purple-900">
                      {Object.keys(fieldHints.dynamic_fields).length} custom
                    </Badge>
                  </div>
                </button>

                {expandedCategories.has('Supplier-Specific Fields') && (
                  <div className="border-t border-purple-200 p-4 space-y-3 bg-white">
                    {Object.entries(fieldHints.dynamic_fields).map(([fieldKey, fieldLabel]) => (
                      <div
                        key={fieldKey}
                        className="p-3 rounded-lg border border-purple-200 bg-purple-50/20"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="text-[10px] h-5 bg-purple-500 text-white">
                                Custom Field
                              </Badge>
                              <span className="text-sm font-medium text-purple-900">
                                {fieldLabel}
                              </span>
                            </div>
                            <p className="text-xs text-purple-700">
                              Field: <code className="bg-purple-100 px-1 rounded">{fieldKey}</code> - This field is unique to this supplier's forms
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Predefined Fields */}
            {Object.entries(fieldsByCategory).map(([category, fields]) => {
              const isExpanded = expandedCategories.has(category)
              const enabledCount = fields.filter(f => fieldHints.enabled_fields.includes(f.key)).length

              return (
                <div key={category} className="border rounded-lg">
                  {/* Category Header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="font-semibold text-sm">{category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {enabledCount}/{fields.length}
                      </Badge>
                    </div>
                  </button>

                  {/* Category Fields */}
                  {isExpanded && (
                    <div className="border-t p-4 space-y-3">
                      {fields.map(field => {
                        const isEnabled = fieldHints.enabled_fields.includes(field.key)
                        const isExtracted = isFieldExtracted(field.key)

                        return (
                          <div
                            key={field.key}
                            className={`p-3 rounded-lg border ${
                              isEnabled ? 'bg-gray-50 border-blue-200' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`enable-${field.key}`}
                                checked={isEnabled}
                                onCheckedChange={() => toggleEnabledField(field.key)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Label
                                    htmlFor={`enable-${field.key}`}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {field.label}
                                  </Label>
                                  {isExtracted && (
                                    <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200">
                                      Extracted
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mb-2">{field.description}</p>

                                {isEnabled && (
                                  <div className="mt-2 pl-2 border-l-2 border-blue-200">
                                    <div className="flex items-start gap-2">
                                      <Info className="h-4 w-4 text-gray-400 mt-1.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <Label htmlFor={`note-${field.key}`} className="text-xs text-gray-500">
                                          Field Note (optional)
                                        </Label>
                                        <Input
                                          id={`note-${field.key}`}
                                          placeholder="e.g., Usually in red box at top right"
                                          value={fieldNoteInputs[field.key] || ''}
                                          onChange={e => updateFieldNote(field.key, e.target.value)}
                                          className="h-8 text-xs mt-1"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t p-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} type="button">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} type="button">
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>
    </div>
  )
}
