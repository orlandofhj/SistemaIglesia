package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "historial_usuarios")
public class HistorialUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String accion;
    
    @Column(name = "solicitante_nombre")
    private String solicitanteNombre;
    
    @Column(name = "solicitante_cedula")
    private String solicitanteCedula;
    
    @Column(name = "objetivo_nombre")
    private String objetivoNombre;
    
    @Column(name = "objetivo_cedula")
    private String objetivoCedula;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    // Getters y Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }

    public String getSolicitanteNombre() { return solicitanteNombre; }
    public void setSolicitanteNombre(String solicitanteNombre) { this.solicitanteNombre = solicitanteNombre; }

    public String getSolicitanteCedula() { return solicitanteCedula; }
    public void setSolicitanteCedula(String solicitanteCedula) { this.solicitanteCedula = solicitanteCedula; }

    public String getObjetivoNombre() { return objetivoNombre; }
    public void setObjetivoNombre(String objetivoNombre) { this.objetivoNombre = objetivoNombre; }

    public String getObjetivoCedula() { return objetivoCedula; }
    public void setObjetivoCedula(String objetivoCedula) { this.objetivoCedula = objetivoCedula; }

    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }

    @PrePersist
    protected void onCreate() {
        this.fechaHora = LocalDateTime.now(ZoneId.of("America/Caracas"));
    }
}