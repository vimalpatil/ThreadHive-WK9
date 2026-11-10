import { useEffect, useRef, useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { rephraseText } from "../../services/aiService";
import { handleApiError } from "../../utils/handleApiError";

/**
 * "Rephrase with AI" control for a single text field. Each instance keeps its own
 * loading/suggestion/error state. The field's text is only replaced via onAccept.
 */
export default function RephraseWithAI({ text, field, onAccept, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState(null);
  // Text that the in-flight request / current suggestion was generated from.
  const sourceText = useRef(null);
  const latestText = useRef(text);

  useEffect(() => {
    latestText.current = text;
    // The user edited the field: any pending or shown suggestion is now stale.
    if (sourceText.current !== null && sourceText.current !== text) {
      sourceText.current = null;
      setSuggestion(null);
      setLoading(false);
    }
  }, [text]);

  const handleRephrase = async () => {
    const requested = text;
    sourceText.current = requested;
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const rephrased = await rephraseText(requested, field);
      if (sourceText.current !== requested) return; // edited meanwhile; discard
      setSuggestion(rephrased);
    } catch (err) {
      if (sourceText.current !== requested) return;
      handleApiError(err);
      setError("Couldn't rephrase right now. Your text is unchanged.");
      sourceText.current = null;
    } finally {
      if (sourceText.current === requested || sourceText.current === null) {
        setLoading(false);
      }
    }
  };

  const clear = () => {
    sourceText.current = null;
    setSuggestion(null);
  };

  const handleAccept = () => {
    const accepted = suggestion;
    clear();
    onAccept(accepted);
  };

  return (
    <div className="rephrase-ai mt-2" data-testid={`rephrase-${field}`}>
      <Button
        type="button"
        size="sm"
        variant="outline-secondary"
        onClick={handleRephrase}
        disabled={disabled || loading || !text?.trim()}
      >
        {loading ? (
          <>
            <Spinner as="span" animation="border" size="sm" className="me-2" />
            Rephrasing...
          </>
        ) : (
          "✨ Rephrase with AI"
        )}
      </Button>

      {error && (
        <Alert variant="danger" className="mt-2 mb-0 py-2" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {suggestion && (
        <div className="rephrase-suggestion mt-2 p-3 border rounded">
          <div className="small text-muted mb-1">AI suggestion</div>
          <p className="mb-2" style={{ whiteSpace: "pre-wrap" }}>{suggestion}</p>
          <Button type="button" size="sm" variant="success" className="me-2" onClick={handleAccept}>
            Accept
          </Button>
          <Button type="button" size="sm" variant="outline-secondary" onClick={clear}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
