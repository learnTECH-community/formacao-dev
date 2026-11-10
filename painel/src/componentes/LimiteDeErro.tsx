// T4.13: error boundary. Um erro ao desenhar uma trilha não derruba a página:
// só aquela parte mostra o aviso, com "Tentar de novo". O erro vai para o console.
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** O que esta parte mostra, para a mensagem: "a trilha T2". */
  nome: string;
  children: ReactNode;
}

interface Estado {
  erro: Error | null;
}

export class LimiteDeErro extends Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo): void {
    console.error(`Painel: erro ao mostrar ${this.props.nome}.`, erro, info.componentStack);
  }

  tentarDeNovo = (): void => {
    this.setState({ erro: null });
  };

  render(): ReactNode {
    if (!this.state.erro) return this.props.children;
    // role="alert": o leitor de tela anuncia a mensagem assim que ela aparece.
    return (
      <div className="aviso aviso-erro" role="alert">
        <p>{`Não foi possível mostrar ${this.props.nome}.`}</p>
        <p>
          <button type="button" className="botao" onClick={this.tentarDeNovo}>
            Tentar de novo
          </button>
        </p>
      </div>
    );
  }
}
