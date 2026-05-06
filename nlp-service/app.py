

from flask       import Flask, request, jsonify
from flask_cors  import CORS          # allows Node.js to call this
from search      import search_artworks  # our search logic
from dotenv      import load_dotenv   # reads .env file

# Load environment variables (.env file)
load_dotenv('../.env')

# Create the Flask app
app = Flask(__name__)
CORS(app)   # allows cross-origin requests (from Node.js or the browser)


@app.route('/search', methods=['GET'])
def search():
    """
    Main search endpoint.
    The Node.js backend calls this URL with the user's query.

    Example call:  GET http://localhost:5000/search?q=yellow+flower
    Returns:       JSON list of matching artworks, sorted by score
    """

    # Get the query from the URL  (?q=...)
    query = request.args.get('q', '').strip()

    # If nothing was typed, return an error
    if not query:
        return jsonify({
            'success': False,
            'error':   'No query provided'
        }), 400

    # Run our search function
    results = search_artworks(query)

    # Return results as JSON
    return jsonify({
        'success': True,
        'query':   query,
        'count':   len(results),
        'results': results
    })



@app.route('/health', methods=['GET'])
def health():
    """
    Simple health check.
    Node.js pings this to check if the Python service is running.
    Returns: { "status": "ok" }
    """
    return jsonify({ 'status': 'ok', 'service': 'Abbey NLP Search' })



# START THE SERVER

if __name__ == '__main__':
    print('='*50)
    print('  Abbey NLP Search Service')
    print('  Running on http://localhost:5000')
    print('  Press CTRL+C to stop')
    print('='*50)
    app.run(host='0.0.0.0', port=5000, debug=True)
