import json
import uuid

def lambda_handler(event, context):
    try:
        # Parse agent_id from the request body
        body = {}
        if "body" in event and event["body"]:
            try:
                body = json.loads(event["body"])
            except Exception as e:
                print("JSON parse error:", e)

        agent_id = body.get("agent_id", str(uuid.uuid4()))

        # Create a demo task
        task = {
            "task_id": str(uuid.uuid4()),
            "task": "classify_image",
            "payload": {"image_url": "https://example.com/sample.jpg"},
            "agent_id": agent_id
        }

        print("Generated task:", task)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(task)
        }

    except Exception as e:
        print("Error in Lambda:", e)
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Internal Server Error"})
        }

