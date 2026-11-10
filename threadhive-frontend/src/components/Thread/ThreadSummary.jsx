import { useDispatch, useSelector } from "react-redux";
import { Alert, Button, Card, Spinner } from "react-bootstrap";
import { summarizeThread } from "../../reducers/currentThreadSlice";

const ThreadSummary = ({ threadId }) => {
  const dispatch = useDispatch();
  const { summary, summaryLoading, summaryError } = useSelector(
    (state) => state.currentThread,
  );

  return (
    <div className="mb-4">
      <Button
        variant="outline-primary"
        onClick={() => dispatch(summarizeThread(threadId))}
        disabled={summaryLoading}
      >
        {summaryLoading ? (
          <>
            <Spinner as="span" animation="border" size="sm" className="me-2" />
            Summarizing...
          </>
        ) : summary ? (
          "Regenerate summary"
        ) : (
          "Summarize"
        )}
      </Button>

      {summaryError && (
        <Alert variant="danger" className="mt-3 mb-0">
          {summaryError}
        </Alert>
      )}

      {summary && (
        <Card className="mt-3" data-testid="thread-summary">
          <Card.Body>
            <Card.Title as="h6">AI Summary</Card.Title>
            <Card.Text>{summary}</Card.Text>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default ThreadSummary;
